export default class Utils {
  // set local storage
  static setStore = (name, content) => {
    if (!name) return;
    if (typeof content !== "string") {
      content = JSON.stringify(content);
    }
    return window.localStorage.setItem(name, content);
  };
  // get local storage
  static getStore = (name) => {
    if (!name) return;
    return JSON.parse(window.localStorage.getItem(name));
  };
  // remove item
  static removeItem = (name) => {
    if (!name) return;
    return window.localStorage.removeItem(name);
  };
  // validate email
  static isValidEmail = (value) => {
    return value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,64}$/i.test(value)
      ? false
      : true;
  };

  static resolveAppUrl = (target = "") => {
    if (!target) {
      return import.meta.env.BASE_URL || "/";
    }

    if (/^(https?:)?\/\//i.test(target)) {
      return target;
    }

    const baseUrl = new URL(import.meta.env.BASE_URL || "/", window.location.origin);
    const normalizedTarget = target.startsWith("/") ? target.slice(1) : target;
    return new URL(normalizedTarget, baseUrl).toString();
  };
}
