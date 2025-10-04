import Cloudflare from 'cloudflare';

export async function deploy({ request }: { request: Request }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const deploymentName = formData.get('deploymentName') as string;
    const token = formData.get('token') as string;
    let chefDeploySecret: string | undefined;

    if (globalThis.process.env.CHEF_DEPLOY_SECRET) {
      chefDeploySecret = globalThis.process.env.CHEF_DEPLOY_SECRET;
    }

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!token || !deploymentName) {
      return new Response(JSON.stringify({ error: 'Missing authentication or deployment info' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const PROVISION_HOST = globalThis.process.env.PROVISION_HOST || 'https://api.convex.dev';
    //const PROVISION_HOST = "http://127.0.0.1:8000";
    const Authorization = `Bearer ${token}`;
    const headers: Record<string, string> = {
      Authorization,
    };
    if (chefDeploySecret) {
      headers['convex-chef-deploy-secret'] = chefDeploySecret;
    }
    const response = await fetch(`${PROVISION_HOST}/api/hosting/deploy?deploymentName=${deploymentName}`, {
      method: 'POST',
      headers,
      body: file,
    });

    if (!response.ok) {
      const error = await response.json();
      console.log(error);
      return new Response(JSON.stringify(error), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();

    // Try to purge Cloudflare cache
    const cfApiToken = globalThis.process.env.CLOUDFLARE_API_KEY;
    const zoneId = globalThis.process.env.CLOUDFLARE_ZONE_ID;

    if (cfApiToken && zoneId) {
      try {
        const client = new Cloudflare({ apiToken: cfApiToken });
        await client.cache.purge({
          zone_id: zoneId,
          hosts: [`${deploymentName}.convex.app`],
        });
        console.log(`Purged cache for ${deploymentName}.convex.app`);
      } catch (err) {
        // Log failure but continue with deployment response
        console.error('Failed to purge cache:', err instanceof Error ? err.message : 'Unknown error');
      }
    } else if (new URL(request.url).hostname === 'localhost') {
      const localDevWarning =
        'Warning: deploy succeeded, but not purging Cloudflare cache because Cloudflare credentials missing in local environment';
      console.error(localDevWarning);
      return new Response(JSON.stringify({ ...result, localDevWarning }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Deploy error:', error);
    return new Response(JSON.stringify({ error: 'Deployment failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
