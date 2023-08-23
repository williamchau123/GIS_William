import React, { useState, useEffect } from "react";
import { GetStaticProps } from "next";
import Map from "../components/Map";
import axios from "axios";

const GIS: React.FC = (props) => {
  const [allLoc, setAllLoc] = useState(null);
  const [allCent, setAllCent] = useState(null);
  useEffect(() => {
    axios
      .get("/api/getAll")
      .then((response) => {
        setAllLoc(response);
      })
      .catch((e) => {
        console.log(e);
      });
    axios
      .get("/api/getCent")
      .then((response) => {
        setAllCent(response);
      })
      .catch((e) => {
        console.log(e);
      });
  }, []);
  const mapProps = [allLoc, allCent];
  return (
    <div className="page">
      <h1>Demographic Harvesting</h1>
      <main>
        {allLoc && allCent && <Map props={mapProps}/>}
      </main>
    </div>
  );
};

export default GIS;
