import type { Tool } from 'ai';
import { z } from 'zod';

// Stubbed for self-hosted - deployment name should be from env

export const getConvexDeploymentNameDescription = `
Get the name of the Convex deployment this project is using from the environment configuration.
`;

export const getConvexDeploymentNameParameters = z.object({});

export const getConvexDeploymentNameTool: Tool = {
  description: getConvexDeploymentNameDescription,
  parameters: getConvexDeploymentNameParameters,
};
