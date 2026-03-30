import { createContext, useContext } from 'react';

// onNavigate(page, state?) — state is passed to the target page once then cleared
export const NavigationContext = createContext({ activePage: '', pageState: null, onNavigate: () => {} });
export const useNavigation = () => useContext(NavigationContext);
