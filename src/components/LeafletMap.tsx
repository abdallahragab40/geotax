// خريطة ملوّنة موثوقة عبر Leaflet + OpenStreetMap داخل WebView (تعمل بدون مفاتيح).
// نفس واجهة المكوّن السابق حتى لا يتأثر باقي الكود.
import React, { useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { MAP_ATTRIBUTION, MAP_TILE_URL } from "../lib/config";

export interface MapMarker {
  id: number;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  color: string;
}

const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 }; // القاهرة

function buildHtml(markers: MapMarker[], center: { lat: number; lng: number }) {
  const markersJson = JSON.stringify(markers).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <style>
    html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#aad3df}
    .pin{width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
         border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)}
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var markers = ${markersJson};
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  var center = ${JSON.stringify(center)};
  var map = L.map('map', { zoomControl: true }).setView([center.lat, center.lng], 11);
  L.tileLayer(${JSON.stringify(MAP_TILE_URL)}, {
    maxZoom: 19, attribution: ${JSON.stringify(MAP_ATTRIBUTION)}
  }).addTo(map);
  function post(m){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  var bounds = [];
  markers.forEach(function(m){
    var color = /^#[0-9a-fA-F]{3,8}$/.test(m.color) ? m.color : '#0E7C66';
    var icon = L.divIcon({ className:'', html:'<div class="pin" style="background:'+color+'"></div>',
      iconSize:[18,18], iconAnchor:[9,18] });
    var marker = L.marker([m.lat, m.lng], {icon:icon}).addTo(map);
    marker.bindPopup('<b>'+esc(m.title)+'</b><br/>'+esc(m.subtitle));
    marker.on('click', function(){ post({ type:'marker', id:m.id }); });
    bounds.push([m.lat, m.lng]);
  });
  if (bounds.length === 1) map.setView(bounds[0], 15);
  else if (bounds.length > 1) map.fitBounds(bounds, { padding:[40,40] });
  // محاولة إظهار موقع المستخدم
  map.locate({ setView: false, watch: false });
  map.on('locationfound', function(e){
    L.circleMarker(e.latlng, { radius:7, color:'#2563EB', fillColor:'#2563EB', fillOpacity:.9 }).addTo(map);
  });
</script>
</body>
</html>`;
}

export default function LeafletMap({
  markers,
  onMarkerPress,
}: {
  markers: MapMarker[];
  onMarkerPress?: (id: number) => void;
}) {
  const webRef = useRef<WebView>(null);
  // إعادة بناء الصفحة فقط عند تغيّر العلامات (وليس مع كل إعادة رسم)
  const html = useMemo(() => {
    const center = markers.length > 0 ? { lat: markers[0].lat, lng: markers[0].lng } : DEFAULT_CENTER;
    return buildHtml(markers, center);
  }, [markers]);

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === "marker" && typeof data.id === "number") onMarkerPress?.(data.id);
    } catch {}
  };

  return (
    <WebView
      ref={webRef}
      style={styles.map}
      originWhitelist={["*"]}
      source={{ html }}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      geolocationEnabled
      startInLoadingState
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: "#aad3df" },
});
