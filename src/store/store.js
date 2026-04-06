import { createStore } from "vuex";
import Utils from "../config/utils";

// BUG FIX: Removed `Vue.use(Vuex)` — not needed with Vue 3's createStore().
// In Vue 3, Vuex is registered via app.use(store) in main.js, not via Vue.use().

const user = Utils.getStore("user");

const store = createStore({
  state: {
    loginUser: user,
  },
  mutations: {
    setLoginUser(state, user) {
      state.loginUser = user;
      Utils.setStore("user", user);
    },
  },
  actions: {},
  getters: {
    getLoginUserInfo(state) {
      return state.loginUser;
    },
  },
});

export default store;
