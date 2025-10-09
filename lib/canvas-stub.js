module.exports = {
  createCanvas(width, height) {
    return {
      width,
      height,
      getContext() {
        return null;
      },
      toBuffer() {
        return Buffer.alloc(0);
      },
    };
  },
  Image: function () {},
};