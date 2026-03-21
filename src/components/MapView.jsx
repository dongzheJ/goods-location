import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapContainer, 
  ImageOverlay, 
  useMap, 
  useMapEvents, 
  Rectangle, 
  Tooltip,
  Popup,
  Marker
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom bouncing pin icon
const createPinIcon = () => {
  const html = renderToStaticMarkup(
    <div className="animate-bounce-pin">
      <MapPin className="text-red-500 fill-red-500/20 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" size={40} strokeWidth={2.5} />
    </div>
  );
  return L.divIcon({
    html,
    className: 'custom-pin',
    iconSize: [40, 40],
    iconAnchor: [20, 40], // Point at the bottom center
  });
};

const pinIcon = createPinIcon();

const MapEvents = ({ onMapClick, onMouseMove, onMouseDown, onMouseUp }) => {
  useMapEvents({
    mousedown: (e) => {
      console.log("MapEvents: mousedown");
      onMouseDown && onMouseDown(e);
    },
    mouseup: (e) => {
      console.log("MapEvents: mouseup");
      onMouseUp && onMouseUp(e);
    },
    click: (e) => onMapClick(e),
    mousemove: (e) => onMouseMove && onMouseMove(e),
  });
  return null;
};

const MapController = ({ bounds, mappingMode }) => {
  const map = useMap();
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (bounds && !hasInitialized.current) {
      map.fitBounds(bounds);
      hasInitialized.current = true;
    }
  }, [bounds, map]);

  useEffect(() => {
    if (mappingMode) {
      map.dragging.disable();
      map.boxZoom.disable();
      map.doubleClickZoom.disable();
    } else {
      map.dragging.enable();
      map.boxZoom.enable();
      map.doubleClickZoom.enable();
    }
  }, [mappingMode, map]);

  return null;
};

const MapView = ({ 
  imageUrl, 
  width, 
  height, 
  shelves = {}, 
  activeShelfId = null,
  mappingMode = false,
  onMapClick,
  onShelfSelect,
  onMappingComplete
}) => {
  const bounds = useMemo(() => [[0, 0], [height, width]], [height, width]);
  const [mousePos, setMousePos] = useState(null);
  const [drawingStart, setDrawingStart] = useState(null);

  const handleMouseDown = (e) => {
    if (!mappingMode) return;
    const { lat, lng } = e.latlng;
    const startPos = { x: Math.round(lng), y: Math.round(lat) };
    console.log("MouseDown at:", startPos);
    setDrawingStart(startPos);
  };

  const handleMouseUp = (e) => {
    if (!mappingMode || !drawingStart) return;
    const { lat, lng } = e.latlng;
    const end = { x: Math.round(lng), y: Math.round(lat) };
    console.log("MouseUp at:", end);
    
    const x = Math.min(drawingStart.x, end.x);
    const y = Math.min(drawingStart.y, end.y);
    const w = Math.abs(end.x - drawingStart.x);
    const h = Math.abs(end.y - drawingStart.y);
    
    if (w > 5 && h > 5) {
      console.log("Mapping Complete:", { x, y, w, h });
      onMappingComplete({ x, y, w, h });
    }
    setDrawingStart(null);
  };

  const handleMouseMove = (e) => {
    const { lat, lng } = e.latlng;
    const pos = { x: Math.round(lng), y: Math.round(lat) };
    if (drawingStart) {
      // Small optimization: only update mousePos for preview if drawing
      setMousePos(pos);
    } else {
      // In mapping mode, we still show the coordinates
      if (mappingMode) setMousePos(pos);
    }
  };

  const drawingRect = (mappingMode && drawingStart && mousePos) ? [
    [Math.min(drawingStart.y, mousePos.y), Math.min(drawingStart.x, mousePos.x)],
    [Math.max(drawingStart.y, mousePos.y), Math.max(drawingStart.x, mousePos.x)]
  ] : null;

  const activeShelf = activeShelfId ? shelves[activeShelfId] : null;
  const flyToTarget = activeShelf ? [activeShelf.y, activeShelf.x] : null;

  return (
    <div className="w-full h-full relative cursor-crosshair">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxZoom={4}
        minZoom={-2}
        className="w-full h-full bg-slate-900"
        attributionControl={false}
      >
        <MapController bounds={bounds} mappingMode={mappingMode} />
        <MapEvents 
          onMouseDown={handleMouseDown} 
          onMouseUp={handleMouseUp} 
          onMapClick={() => {}} 
          onMouseMove={handleMouseMove} 
        />
        <ImageOverlay url={imageUrl} bounds={bounds} interactive={false} />

        {/* Drawing Preview */}
        {drawingRect && (
          <Rectangle 
            bounds={drawingRect} 
            pathOptions={{ color: '#fbbf24', dashArray: '5, 5', fillOpacity: 0.1 }} 
          />
        )}
        
        {/* Render all mapped shelves */}
        {Object.entries(shelves).map(([id, shelf]) => {
          const isSelected = id === activeShelfId;
          const rectBounds = [
            [shelf.y, shelf.x],
            [shelf.y + shelf.h, shelf.x + shelf.w]
          ];
          
          return (
            <React.Fragment key={id}>
              <Rectangle
                bounds={rectBounds}
                pathOptions={{
                  color: isSelected ? '#ef4444' : '#3b82f6',
                  weight: isSelected ? 4 : 1,
                  fillOpacity: isSelected ? 0.3 : 0.05,
                  className: isSelected ? 'animate-super-pulse' : ''
                }}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (onShelfSelect) onShelfSelect(id);
                  }
                }}
              >
                <Tooltip sticky>{id}</Tooltip>
              </Rectangle>
              
              {isSelected && (
                <Marker 
                  position={[shelf.y + shelf.h / 2, shelf.x + shelf.w / 2]} 
                  icon={pinIcon}
                >
                  <Popup offset={[0, -20]}>
                    <div className="text-slate-900 font-bold">{id}</div>
                  </Popup>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

        {/* Mouse Position Indicator (Dev Mode) */}
        {mappingMode && mousePos && (
          <div className="absolute bottom-4 left-4 z-[1000] bg-black/70 text-white px-3 py-1 rounded-full text-xs font-mono border border-white/20">
            X: {mousePos.x} | Y: {mousePos.y}
          </div>
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;
