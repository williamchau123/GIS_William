import conn from "../../../lib/db";

export default async (req, res) => {
  try {
    const data = [req.body.data.circle.geometry];
    const query =
      "SELECT income, population, ST_AsGeoJSON(ST_Centroid(spatialobj)) as centroid, ST_AsGeoJSON(spatialobj) FROM dfw_demo WHERE ST_Intersects(ST_Centroid(spatialobj), ST_SetSRID(st_geomfromgeojson($1), 4326));";

    const result = await conn.query(query, data);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
  }
};
