import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapView(props) {
  const { currentLocation, zoom, scrollWheelZoom } = props;

  return (
    <MapContainer center={currentLocation} zoom={zoom} scrollWheelZoom={scrollWheelZoom}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
      />
    </MapContainer>
  );
}

MapView.defaultProps = {
  currentLocation: { lat: 12.8797, lng: 121.7740 },
  zoom: 6,
  scrollWheelZoom: false
};

export default MapView;