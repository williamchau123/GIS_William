import conn from "../../../lib/db";

export default async (req, res) => {
  try {
    const query = "SELECT ST_AsGeoJSON(spatialobj) FROM dfw_demo;";
    const values = [req.body.content];
    const result = await conn.query(query);
    res.status(200).json(result);
    // console.log( "ttt",result );
  } catch (error) {
    console.log(error);
  }
};
