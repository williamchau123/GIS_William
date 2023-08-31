import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";

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

class Map extends React.Component {
  mapContainerRef: any;
  all: number;
  cent: number;
  map: mapboxgl.map;
  state: {
    lng: number;
    lat: number;
    zoom: number;
    lngLat: { lng: number; lat: number };
    circle: { lng: number; lat: number };
    radius: number;
    avgIncome: number;
    ttlPop: number;
    all: string[];
    cent: string[];
  };
  constructor(props: any) {
    super(props);
    this.mapContainerRef = React.createRef();
    this.state = {
      lng: -96.575,
      lat: 33.1931,
      zoom: 9.55,
      lngLat: { lng: -96.575, lat: 33.1931 },
      circle: { lng: -96.575, lat: 33.1931 },
      radius: 5,
      avgIncome: 0,
      ttlPop: 0,
      all: props.props[0],
      cent: props.props[1],
    };
  }

  // Initialize this.map when component mounts
  componentDidMount() {
    mapboxgl.accessToken =
      "pk.eyJ1Ijoid2lsbGlhbWNoYXUxMjMiLCJhIjoiY2xsbDg0bmdtMWxvcjNzdWw3aXc2ZThxMiJ9.QbbCJf8D31cYM4WrReCP5g";
    this.map = new mapboxgl.Map({
      container: this.mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [this.state.lng, this.state.lat],
      zoom: this.state.zoom,
    });
    // Add navigation control (the +/- zoom buttons)
    this.map.addControl(new mapboxgl.NavigationControl(), "top-right");

    //update this.map longitude and latitude
    this.map.on("move", () => {
      this.setState({
        lng: this.map.getCenter().lng.toFixed(4),
        lat: this.map.getCenter().lat.toFixed(4),
        zoom: this.map.getZoom().toFixed(2),
      });
    });
    console.log(this.state);
    this.map.on("load", function () {
      let featColl = [];
      let featCollCent = [];
      console.log(this.state);
      if (this.state.all && this.state.cent) {
        // convert the data to geojson format
        for (let i = 0; i < this.state.all.length; i++) {
          featColl.push({
            type: "Feature",
            geometry: JSON.parse(this.state.all[i]),
          });
          featCollCent.push({
            type: "Feature",
            geometry: JSON.parse(this.state.cent[i]),
          });
        }
        this.map.addSource("poly", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: featColl,
          },
        });

        // Add a new layer to visualize the polygon.
        this.map.addLayer({
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
        this.map.addLayer({
          id: "outline",
          type: "line",
          source: "poly",
          layout: {},
          paint: {
            "line-color": "#0080ff",
            "line-width": 3,
          },
        });

        this.map.addSource("cent", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: featCollCent,
          },
        });

        // Add a new layer to visualize the point.
        this.map.addLayer({
          id: "fillc",
          type: "circle",
          source: "cent", // reference the data source
          layout: {},
          paint: {
            "circle-color": "#000", // blue color fill
            "circle-radius": 3,
          },
        });

        this.map.addSource("circle", {
          type: "geojson",
          data: createGeoJSONCircle(
            [this.state.circle.lng, this.state.circle.lat],
            this.state.radius
          ),
        });

        this.map.addLayer({
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
              circle: createGeoJSONCircle(
                [this.state.circle.lng, this.state.circle.lat],
                this.state.radius
              ),
            },
          })
          .then((response) => {
            let tempAvgIncome = 0;
            let tempTtlPop = 0;
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
              tempTtlPop += response.data.rows[i].population;
            }
            this.map.addSource("select", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: selectColl,
              },
            });
            this.map.addLayer({
              id: "select",
              type: "fill",
              source: "select",
              layout: {},
              paint: {
                "fill-color": "orange",
                "fill-opacity": 0.6,
              },
            });
            this.map.addSource("selectCent", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: selectCollCent,
              },
            });
            this.map.addLayer({
              id: "selectCent",
              type: "circle",
              source: "selectCent",
              layout: {},
              paint: {
                "circle-color": "yellow",
                "circle-radius": 3,
              },
            });
            this.setState({
              avgIncome: parseFloat(
                (tempAvgIncome / response.data.rows.length).toFixed(2)
              ),
              ttlPop: tempTtlPop,
            });
          })
          .catch((e) => {
            console.log(e);
          });
      }
    });

    const marker = new mapboxgl.Marker({
      draggable: true,
    })
      .setLngLat([this.state.circle.lng, this.state.circle.lat])
      .addTo(this.map);

    function onDrag(e) {
      // update the marker coordinates anytime the marker is dragged
      let lngLat = e.target._lngLat;
      const newCircle = createGeoJSONCircle(
        [this.state.lngLat.lng, this.state.lngLat.lat],
        this.state.radius
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
          let tempAvgIncome = 0;
          let tempTtlPop = 0;

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
            tempTtlPop += response.data.rows[i].population;
          }
          this.map.getSource("select").setData({
            type: "FeatureCollection",
            features: selectColl,
          });
          this.map.getSource("selectCent").setData({
            type: "FeatureCollection",
            features: selectCollCent,
          });

          this.setState({
            avgIncome: parseFloat(
              (tempAvgIncome / response.data.rows.length).toFixed(2)
            ),
            ttlPop: tempTtlPop,
          });
        })
        .catch((e) => {
          console.log(e);
        });
      // update the circle coordinates anytime the marker is dragged
      this.setState({ circle: lngLat });
      this.map.getSource("circle").setData(newCircle);
    }

    marker.on("drag", onDrag);
  } // eslint-disable-line react-hooks/exhaustive-deps

  componentWillUnmount() {
    this.map.remove();
  }

  render() {
    return (
      <div>
        <div className="sidebarStyle">
          <div>
            Longitude: {this.state.lng} | Latitude: {this.state.lat} | Zoom:{" "}
            {this.state.zoom}
          </div>
          {this.state.circle && (
            <div>Circle Longitude: {this.state.circle.lng}</div>
          )}
          {this.state.circle && (
            <div>Circle Latitude: {this.state.circle.lat}</div>
          )}
        </div>
        <div className="sidebarStyle">
          <div>Average Income: {this.state.avgIncome}</div>
          <div>Total Population: {this.state.ttlPop}</div>
        </div>
        <label>
          Radius:
          <input
            type="number"
            value={this.state.radius}
            onChange={function (e) {
              this.setState({ radius: e.target.value });
            }}
          />
        </label>
        <div className="map-container" ref={this.mapContainerRef} />
      </div>
    );
  }
}

export default Map;
