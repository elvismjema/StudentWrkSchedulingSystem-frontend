import axios from "axios";
import Utils from "../config/utils.js";
import AuthServices from "./authServices.js";
import Router from "../router.js";

let baseurl = import.meta.env.VITE_API_BASE;
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
