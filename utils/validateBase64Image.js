const validateBase64Image = (base64String) => {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return false;

  const mimeType = matches[1];
  const base64Data = matches[2];

  // ✅ Allow only specific image MIME types
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!validTypes.includes(mimeType)) return false;

  // ✅ Limit size: Max 5MB
  const maxSizeInBytes = 5 * 1024 * 1024; // 5 MB
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > maxSizeInBytes) return false;

  return true;
};

module.exports = validateBase64Image;
