import { MapPinOff } from "lucide-react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import icone2x from "leaflet/dist/images/marker-icon-2x.png";
import icone from "leaflet/dist/images/marker-icon.png";
import sombra from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: icone2x,
  iconUrl: icone,
  shadowUrl: sombra,
});

interface Props {
  lat?: number | null;
  lng?: number | null;
  exato: boolean;
  titulo: string;
}

export function MapaImovel({ lat, lng, exato, titulo }: Props) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return (
      <div
        className="flex h-80 flex-col items-center justify-center gap-2 rounded-lg border border-stone-200 bg-stone-100 text-stone-500"
        data-testid="mapa-indisponivel"
      >
        <MapPinOff className="h-8 w-8" />
        <p className="text-sm">Mapa indisponível para este imóvel.</p>
      </div>
    );
  }

  const centro: [number, number] = [lat, lng];

  return (
    <div>
      <div className="h-80 overflow-hidden rounded-lg border border-stone-200" data-testid="mapa-imovel">
        <MapContainer
          center={centro}
          zoom={exato ? 16 : 14}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {exato ? (
            <Marker position={centro} />
          ) : (
            <Circle
              center={centro}
              radius={700}
              pathOptions={{ color: "#1c1917", fillColor: "#78716c", fillOpacity: 0.25, weight: 2 }}
            />
          )}
        </MapContainer>
      </div>
      {!exato ? (
        <p className="mt-2 text-xs text-stone-500" data-testid="mapa-localizacao-aproximada">
          Localização aproximada da região do bairro. Por segurança e privacidade, o endereço exato de{" "}
          {titulo} é compartilhado somente após o contato com um corretor.
        </p>
      ) : null}
    </div>
  );
}
