import axios from "axios";
import config from "../config/config";

const environment = config[process.env.NODE_ENV || "development"];
const ipApiBaseUrl = environment.ipApi;

export const obtenerUbicacionPorIP = async (
  ipAddress: string,
  apiBaseUrl: string = ipApiBaseUrl
) => {
  try {
    const ipApiResponse = await axios.get(`${apiBaseUrl}/${ipAddress}`);

    if (ipApiResponse.data.status !== "success") {
      throw new Error(
        "La solicitud a la API no fue exitosa: " + ipApiResponse.data.message
      );
    }

    const location = {
      ip: ipApiResponse.data.query,
      status: ipApiResponse.data.status,
      continente: ipApiResponse.data.continent,
      continenteCode: ipApiResponse.data.continentCode,
      pais: ipApiResponse.data.country,
      paisCode: ipApiResponse.data.countryCode,
      region: ipApiResponse.data.region,
      regionName: ipApiResponse.data.regionName,
      ciudad: ipApiResponse.data.city,
      distrito: ipApiResponse.data.district,
      zip: ipApiResponse.data.zip,
      latitud: ipApiResponse.data.lat,
      longitud: ipApiResponse.data.lon,
      timezone: ipApiResponse.data.timezone,
      offset: ipApiResponse.data.offset,
      currency: ipApiResponse.data.currency,
      isp: ipApiResponse.data.isp,
      operador: ipApiResponse.data.org,
      as: ipApiResponse.data.as,
      mobile: ipApiResponse.data.mobile,
    };
    return location;
  } catch (error) {
    console.error("Error al obtener la ubicación por IP:", error);
    throw error;
  }
};
