import conn from "../../../lib/db";

export default async (req, res) => {
  try {
    const query = "SELECT ST_AsGeoJSON(ST_Centroid(spatialobj)) FROM dfw_demo;";
    const result = await conn.query(query);
    res.status(200).json(result);
    // console.log( "ttt",result );
  } catch (error) {
    console.log(error);
  }
};

