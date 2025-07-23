// utils/validateBase64Image.js

const validateBase64Image = (base64String) => {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return false;

  const mimeType = matches[1];
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(mimeType);
};

module.exports = validateBase64Image;
