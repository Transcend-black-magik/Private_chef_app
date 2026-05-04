export async function uploadUserProfilePhoto(_userId: string, base64: string, assetType = "image/jpeg") {
  if (!base64.trim()) {
    throw new Error("Photo data is missing.");
  }

  return `data:${assetType};base64,${base64}`;
}
