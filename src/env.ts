export let workspaceUri = process.cwd();
export const setWorkspaceUri = (uri: string) => {
  workspaceUri = uri;
};
