import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API;

const createGeoJSONCircle = function (center, radiusInKm, points = 64) {
  let coords = {
    latitude: center[1],
    longitude: center[0],
  };

  let km = radiusInKm;

  let ret = [];
  let distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
  let distanceY = km / 110.574;

  let theta, x, y;
  for (let i = 0; i < points; i++) {
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
  const radiusRef = useRef(5);

  const [avgIncome, setAvgIncome] = useState("");
  const [ttlPop, setTtlPop] = useState(0);
  let map: mapboxgl.Map;
  const [tMap, setMap] = useState<mapboxgl.Map>();

  // Initialize map when component mounts
  useEffect(() => {
    map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [lng, lat],
      zoom: zoom,
    });
    setMap(map);

    // Add navigation control (the +/- zoom buttons)
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    //update map longitude and latitude
    map.on("move", () => {
      setLng(map.getCenter().lng.toFixed(4));
      setLat(map.getCenter().lat.toFixed(4));
      setZoom(map.getZoom().toFixed(2));
    });

    map.on("load", function () {
      let featColl = [];
      let featCollCent = [];
      // convert the data to geojson format
      for (let i = 0; i < all.length; i++) {
        featColl.push({
          type: "Feature",
          geometry: JSON.parse(all[i]),
        });
        featCollCent.push({
          type: "Feature",
          geometry: JSON.parse(cent[i]),
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
      axios
        .post("/api/getIntersect", {
          data: {
            circle: createGeoJSONCircle([circle.lng, circle.lat], radius),
          },
        })
        .then((response) => {
          let tempAvgIncome: string;
          let tempTtlPop = 0;
          tempAvgIncome = response.data.avg;
          tempTtlPop = response.data.sum;
          for (let i = 0; i < response.data.rows.length; i++) {
            selectColl.push({
              type: "Feature",
              geometry: JSON.parse(response.data.rows[i].st_asgeojson),
            });
            selectCollCent.push({
              type: "Feature",
              geometry: JSON.parse(response.data.rows[i].centroid),
            });
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
          setAvgIncome(parseFloat(tempAvgIncome).toFixed(2));
          setTtlPop(tempTtlPop);
        })
        .catch((e) => {
          console.log(e);
        });
    });
    return () => map.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function getRadius() {
    return radiusRef.current;
  }
  useEffect(() => {
    radiusRef.current = radius;
    const newCircle = createGeoJSONCircle([circle.lng, circle.lat], radius);
    if (tMap != null) {
      try {
        tMap.getSource("circle").setData(newCircle);
        let selectColl = [];
        let selectCollCent = [];
        axios
          .post("/api/getIntersect", {
            data: {
              circle: newCircle,
            },
          })
          .then((response) => {
            let tempAvgIncome: string;
            let tempTtlPop = 0;
            tempAvgIncome = response.data.avg;
            tempTtlPop = response.data.sum;
            for (let i = 0; i < response.data.rows.length; i++) {
              selectColl.push({
                type: "Feature",
                geometry: JSON.parse(response.data.rows[i].st_asgeojson),
              });
              selectCollCent.push({
                type: "Feature",
                geometry: JSON.parse(response.data.rows[i].centroid),
              });
            }
            tMap.getSource("select").setData({
              type: "FeatureCollection",
              features: selectColl,
            });
            tMap.getSource("selectCent").setData({
              type: "FeatureCollection",
              features: selectCollCent,
            });

            setAvgIncome(parseFloat(tempAvgIncome).toFixed(2));
            setTtlPop(tempTtlPop);
          })
          .catch((e) => {
            console.log(e);
          });
      } catch (e) {
        console.log(e);
      }
    }
    let marker = new mapboxgl.Marker({
      draggable: true,
    })
      .setLngLat([circle.lng, circle.lat])
      .addTo(map);
    let end = false;
    function onDrag(e) {
      // update the marker coordinates anytime the marker is dragged
      lngLat = e.target._lngLat;
      const newCircle = createGeoJSONCircle(
        [lngLat.lng, lngLat.lat],
        getRadius()
      );
      let selectColl = [];
      let selectCollCent = [];
      axios
        .post("/api/getIntersect", {
          data: {
            circle: newCircle,
          },
        })
        .then((response) => {
          if (!end) {
            let tempAvgIncome: string;
            let tempTtlPop = 0;
            tempAvgIncome = response.data.avg;
            tempTtlPop = response.data.sum;
            for (let i = 0; i < response.data.rows.length; i++) {
              selectColl.push({
                type: "Feature",
                geometry: JSON.parse(response.data.rows[i].st_asgeojson),
              });
              selectCollCent.push({
                type: "Feature",
                geometry: JSON.parse(response.data.rows[i].centroid),
              });
            }
            map.getSource("select").setData({
              type: "FeatureCollection",
              features: selectColl,
            });
            map.getSource("selectCent").setData({
              type: "FeatureCollection",
              features: selectCollCent,
            });

            setAvgIncome(parseFloat(tempAvgIncome).toFixed(2));
            setTtlPop(tempTtlPop);
          }
        })
        .catch((e) => {
          console.log(e);
        });
      // update the circle coordinates anytime the marker is dragged
      setCircle(lngLat); // notify the circle coordinates change
      map.getSource("circle").setData(newCircle);
    }
    function onDragEnd(e) {
      // update the marker coordinates anytime the marker is dragged
      lngLat = e.target._lngLat;
      const newCircle = createGeoJSONCircle(
        [lngLat.lng, lngLat.lat],
        getRadius()
      );
      let selectColl = [];
      let selectCollCent = [];
      end = true;
      axios
        .post("/api/getIntersect", {
          data: {
            circle: newCircle,
          },
        })
        .then((response) => {
          let tempAvgIncome: string;
          let tempTtlPop = 0;
          tempAvgIncome = response.data.avg;
          tempTtlPop = response.data.sum;
          for (let i = 0; i < response.data.rows.length; i++) {
            selectColl.push({
              type: "Feature",
              geometry: JSON.parse(response.data.rows[i].st_asgeojson),
            });
            selectCollCent.push({
              type: "Feature",
              geometry: JSON.parse(response.data.rows[i].centroid),
            });
          }
          map.getSource("select").setData({
            type: "FeatureCollection",
            features: selectColl,
          });
          map.getSource("selectCent").setData({
            type: "FeatureCollection",
            features: selectCollCent,
          });

          setAvgIncome(parseFloat(tempAvgIncome).toFixed(2));
          setTtlPop(tempTtlPop);
        })
        .catch((e) => {
          console.log(e);
        });
    }
    function onDragStart() {
      end = false;
    }
    marker.on("drag", (e) => {
      onDrag(e);
    });
    marker.on("dragend", (e) => {
      onDragEnd(e);
    });
    marker.on("dragstart", onDragStart);

    return () => {};
  }, [radius]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="sidebarStyle">
        <div>
          Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
        </div>
        {circle && <div>Circle Longitude: {circle.lng}</div>}
        {circle && <div>Circle Latitude: {circle.lat}</div>}
      </div>
      <div className="sidebarStyle">
        <div>Average Income: {avgIncome}</div>
        <div>Total Population: {ttlPop}</div>
      </div>
      <label>
        Radius:
        <input
          min="0"
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
