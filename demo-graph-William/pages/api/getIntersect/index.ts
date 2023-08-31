import conn from "../../../lib/db";

export default async (req, res) => {
  try {
    const data = [req.body.data.circle.geometry];
    const query =
      "SELECT ST_AsGeoJSON(ST_Centroid(spatialobj)) as centroid, ST_AsGeoJSON(spatialobj) FROM dfw_demo WHERE ST_Intersects(ST_Centroid(spatialobj), ST_SetSRID(st_geomfromgeojson($1), 4326));";
    const query2 =
      "SELECT AVG(income), SUM(population) FROM dfw_demo WHERE ST_Intersects(ST_Centroid(spatialobj), ST_SetSRID(st_geomfromgeojson($1), 4326));";

    const result = await conn.query(query, data);
    const result2 = await conn.query(query2, data);
    result["avg"] =  result2.rows[0].avg
    result["sum"] =  result2.rows[0].sum
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
  }
};
