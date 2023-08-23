import conn from "../../../lib/db";

export default async (req, res) => {
  try {
    const query = "SELECT";

    const data = [];

    const result = await conn.query(query, data);
    res.status(200).json(result);
    // console.log( "ttt",result );
  } catch (error) {
    console.log(error);
  }
};
