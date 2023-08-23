import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import { stringify } from "querystring";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API;

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

  let map: mapboxgl.Map;

  // Initialize map when component mounts
  useEffect(() => {
    if (!map){
      console.log(map)
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [lng, lat],
        zoom: zoom,
      });
    }

    // Add navigation control (the +/- zoom buttons)
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("move", () => {
      setLng(map.getCenter().lng.toFixed(4));
      setLat(map.getCenter().lat.toFixed(4));
      setZoom(map.getZoom().toFixed(2));
    });

    map.on("load", function () {
      if (
        all &&
        all.data &&
        all.data.rows &&
        cent &&
        cent.data &&
        cent.data.rows
      ) {
        let featColl = [];
        let featCollCent = [];
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
          data: createGeoJSONCircle([lngLat.lng, lngLat.lat], radius),
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
      }
    });

    const marker = new mapboxgl.Marker({
      draggable: true,
    })
      .setLngLat([lng, lat])
      .addTo(map);

    function onDrag() {
      lngLat = marker.getLngLat();
      setCircle(lngLat);
      const newCircle = createGeoJSONCircle([lngLat.lng, lngLat.lat], radius);
      map
        .getSource("circle")
        .setData(newCircle);
      
    }

    marker.on("drag", onDrag);

    // Clean up on unmount
    return () => map.remove();
  }, [radius]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="sidebarStyle">
        <div>
          Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
        </div>
      </div>
      <div className="sidebarStyle">
        {circle && <div>Circle Longitude: {circle.lng}</div>}
        {circle && <div>Circle Latitude: {circle.lat}</div>}
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
