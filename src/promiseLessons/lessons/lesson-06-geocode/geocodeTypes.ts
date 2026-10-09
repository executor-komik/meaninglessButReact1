export type OpenMeteoGeocodeResponse = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
  }>;
};

export type GeocodedPlace = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
};
