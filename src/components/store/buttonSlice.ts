import { createSlice } from '@reduxjs/toolkit';

interface ButtonState {
    button1: boolean;
    button2: boolean;
    button3: boolean;
}

const initialState: ButtonState = {
    button1: false,
    button2: false,
    button3: false,
}

const buttonSlice = createSlice({
  name: 'button',
  initialState: initialState,
  reducers: {
    handleButton1Click: (state: ButtonState) => {
      state.button1 = !state.button1;
    },
    handleButton2Click: (state: ButtonState) => {
      state.button2 = !state.button2;
    },
    handleButton3Click: (state: ButtonState) => {
      state.button3 = !state.button3;
    },
  },
});

export const { handleButton1Click, handleButton2Click, handleButton3Click } = buttonSlice.actions;
export default buttonSlice.reducer;