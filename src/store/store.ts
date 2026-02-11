import { configureStore } from '@reduxjs/toolkit'
import stopsReducer from './stopsSlice'

export const store = configureStore({
  reducer: {
    stops: stopsReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
