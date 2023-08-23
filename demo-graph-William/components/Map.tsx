import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";

var createGeoJSONCircle = function (center, radiusInKm, points = 64) {
  var coords = {
    latitude: center[1],
    longitude: center[0],
  };

  var km = radiusInKm;

  var ret = [];
  var distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
  var distanceY = km / 110.574;

  var theta, x, y;
  for (var i = 0; i < points; i++) {
    theta = (i / points) * (2 * Math.PI);
    x = distanceX * Math.cos(theta);
    y = distanceY * Math.sin(theta);

    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [ret],
    },
  };
};

const Map = (props) => {
  
  const [all, cent] = props.props;
  const mapContainerRef = useRef(null);

  const [lng, setLng] = useState(-96.575);
  const [lat, setLat] = useState(33.1931);
  const [zoom, setZoom] = useState(9.55);

  let lngLat = { lng, lat };
  const [circle, setCircle] = useState(lngLat);

  const [radius, setRadius] = useState(5);

  const [avgIncome, setAvgIncome] = useState(0);
  const [avgPop, setAvgPop] = useState(0);
  let map: mapboxgl.Map;

  // Initialize map when component mounts
  useEffect(async () => {
    await axios.get("/api/getMapAPI").then((response) => {
      mapboxgl.accessToken = response.data.mapKey;
    }).catch((e) => {
      console.log(e);
    });
    map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [lng, lat],
      zoom: zoom,
    });

    // Add navigation control (the +/- zoom buttons)
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    //update map longitude and latitude
    map.on("move", () => {
      setLng(map.getCenter().lng.toFixed(4));
      setLat(map.getCenter().lat.toFixed(4));
      setZoom(map.getZoom().toFixed(2));
    });

    map.on("load", async function () {
      let featColl = [];
      let featCollCent = [];
      // convert the data to geojson format
      for (let i = 0; i < all.data.rows.length; i++) {
        featColl.push({
          type: "Feature",
          geometry: JSON.parse(all.data.rows[i].st_asgeojson),
        });
        featCollCent.push({
          type: "Feature",
          geometry: JSON.parse(cent.data.rows[i].st_asgeojson),
        });
      }
      map.addSource("poly", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: featColl,
        },
      });

      // Add a new layer to visualize the polygon.
      map.addLayer({
        id: "fill",
        type: "fill",
        source: "poly", // reference the data source
        layout: {},
        paint: {
          "fill-color": "#0080ff", // blue color fill
          "fill-opacity": 0.2,
        },
      });
      // Add a outline around the polygon.
      map.addLayer({
        id: "outline",
        type: "line",
        source: "poly",
        layout: {},
        paint: {
          "line-color": "#0080ff",
          "line-width": 3,
        },
      });

      map.addSource("cent", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: featCollCent,
        },
      });

      // Add a new layer to visualize the point.
      map.addLayer({
        id: "fillc",
        type: "circle",
        source: "cent", // reference the data source
        layout: {},
        paint: {
          "circle-color": "#000", // blue color fill
          "circle-radius": 3,
        },
      });

      map.addSource("circle", {
        type: "geojson",
        data: createGeoJSONCircle([circle.lng, circle.lat], radius),
      });

      map.addLayer({
        id: "circle",
        type: "fill",
        source: "circle",
        layout: {},
        paint: {
          "fill-color": "yellow",
          "fill-opacity": 0.6,
        },
      });

      let selectColl = [];
      let selectCollCent = [];
      // fetch the overlapped polygons
      await axios
        .post("/api/getIntersect", {
          data: {
            circle: createGeoJSONCircle([circle.lng, circle.lat], radius),
          },
        })
        .then((response) => {
          let tempAvgIncome = 0;
          let tempAvgPop = 0;
          for (let i = 0; i < response.data.rows.length; i++) {
            selectColl.push({
              type: "Feature",
              geometry: JSON.parse(response.data.rows[i].st_asgeojson),
            });
            selectCollCent.push({
              type: "Feature",
              geometry: JSON.parse(response.data.rows[i].centroid),
            });

            tempAvgIncome += response.data.rows[i].income;
            tempAvgPop += response.data.rows[i].population;
          }
          map.addSource("select", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: selectColl,
            },
          });
          map.addLayer({
            id: "select",
            type: "fill",
            source: "select",
            layout: {},
            paint: {
              "fill-color": "orange",
              "fill-opacity": 0.6,
            },
          });
          map.addSource("selectCent", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: selectCollCent,
            },
          });
          map.addLayer({
            id: "selectCent",
            type: "circle",
            source: "selectCent",
            layout: {},
            paint: {
              "circle-color": "yellow",
              "circle-radius": 3,
            },
          });
          setAvgIncome(
            parseFloat((tempAvgIncome / response.data.rows.length).toFixed(2))
          );
          setAvgPop(Math.round(tempAvgPop / response.data.rows.length));
        })
        .catch((e) => {
          console.log(e);
        });
    });

    const marker = new mapboxgl.Marker({
      draggable: true,
    })
      .setLngLat([circle.lng, circle.lat])
      .addTo(map);

    async function onDrag() {
      // update the marker coordinates anytime the marker is dragged
      lngLat = marker.getLngLat();
      // update the circle coordinates anytime the marker is dragged
      setCircle(lngLat); // notify the circle coordinates change
      const newCircle = createGeoJSONCircle([lngLat.lng, lngLat.lat], radius);
      map.getSource("circle").setData(newCircle);

      let selectColl = [];
      let selectCollCent = [];
      await axios
        .post("/api/getIntersect", {
          data: {
            circle: newCircle,
          },
        })
        .then((response) => {
          let tempAvgIncome = 0;
          let tempAvgPop = 0;

          for (let i = 0; i < response.data.rows.length; i++) {
            selectColl.push({
              type: "Feature",
              geometry: JSON.parse(response.data.rows[i].st_asgeojson),
            });
            selectCollCent.push({
              type: "Feature",
              geometry: JSON.parse(response.data.rows[i].centroid),
            });

            tempAvgIncome += response.data.rows[i].income;
            tempAvgPop += response.data.rows[i].population;
          }
          map.getSource("select").setData({
            type: "FeatureCollection",
            features: selectColl,
          });
          map.getSource("selectCent").setData({
            type: "FeatureCollection",
            features: selectCollCent,
          });

          setAvgIncome(
            parseFloat((tempAvgIncome / response.data.rows.length).toFixed(2))
          );
          setAvgPop(Math.round(tempAvgPop / response.data.rows.length));
        })
        .catch((e) => {
          console.log(e);
        });
    }

    marker.on("drag", onDrag);

    // Clean up on unmount
    return () => map.remove();
  }, [radius]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="map">
      <div className="sidebarStyle">
        <div>
          Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
        </div>
        {circle && <div>Circle Longitude: {circle.lng}</div>}
        {circle && <div>Circle Latitude: {circle.lat}</div>}
      </div>
      <div className="sidebarStyle">
        <div>Average Income: {avgIncome}</div>
        <div>Average Population: {avgPop}</div>
      </div>
      <label>
        Radius:
        <input
          type="number"
          value={radius}
          onChange={function (e) {
            setRadius(parseInt(e.target.value));
          }}
        />
      </label>
      <div className="map-container" ref={mapContainerRef} />
    </div>
  );
};

export default Map;
