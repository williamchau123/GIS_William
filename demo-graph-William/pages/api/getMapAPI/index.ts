export default (req, res) => {
    res.status(200).json({ mapKey: process.env.MAPBOX_API })
  }