export default (req, res) => {
  try {
    res.status(200).json({ mapKey: process.env.MAPBOX_API });
  } catch (error) {
    console.log(error);
  }
};
