import { createContext, useContext } from 'react';

export const SearchContext = createContext({
  searchKeyword: '',
  setSearchKeyword: (keyword: string) => {},
});

export const useSearch = () => useContext(SearchContext);
