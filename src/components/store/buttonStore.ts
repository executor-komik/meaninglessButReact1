import { configureStore } from "@reduxjs/toolkit";

import buttonReducer from "./buttonSlice";

const buttonStore = configureStore({
  reducer: {
    button: buttonReducer,
  },
});

export default buttonStore;