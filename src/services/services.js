import axios from "axios";
import Utils from "../config/utils.js";
import AuthServices from "./authServices.js";
import Router from "../router.js";

const envBaseUrl = import.meta.env.VITE_API_BASE;
const isBrowser = typeof window !== "undefined";
const isNonLocalHost =
  isBrowser &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";

let baseurl = envBaseUrl;
// Guard against accidental production builds that still point to localhost API.
if (isNonLocalHost && /localhost|127\.0\.0\.1/.test(String(envBaseUrl || ""))) {
  baseurl = "/workerscheduling-t2";
}

if (!baseurl) {
  if (import.meta.env.DEV) {
    baseurl = "http://localhost/workerscheduling-t2";
  } else {
    baseurl = "/workerscheduling-t2";
  }
}

const apiClient = axios.create({
  baseURL: baseurl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  transformRequest: (data, headers) => {
    let user = Utils.getStore("user");
    if (user != null) {
      let token = user.token;
      let authHeader = "";
      if (token != null && token != "") authHeader = "Bearer " + token;
      headers["Authorization"] = authHeader;
    }
    return JSON.stringify(data);
  },
  transformResponse: function (data) {
    let parsedData = data;
    if (typeof data === "string" && data.length > 0) {
      try {
        parsedData = JSON.parse(data);
      } catch (err) {
        // Backend/proxy can return HTML on outages (e.g. 503), so avoid hard crash.
        return {
          message: "Service unavailable. Please try again later.",
          raw: data,
        };
      }
    }
    // if (!data.success && data.code == "expired-session") {
    //   localStorage.deleteItem("user");
    // }
    if (
      parsedData &&
      parsedData.message !== undefined &&
      parsedData.message.includes("Unauthorized")
    ) {
      AuthServices.logoutUser(Utils.getStore("user"))
        .then((response) => {
          console.log(response);
          Utils.removeItem("user");
          Router.push({ name: "login" });
        })
        .catch((error) => {
          console.log("error", error);
        });
      // Utils.removeItem("user")
    }
    // console.log(Utils.getStore("user"))
    return parsedData;
  },
});

export default apiClient;
