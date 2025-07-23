// utils/validateBase64Image.js

const validateBase64Image = (base64String) => {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return false;

  
};

module.exports = validateBase64Image;
