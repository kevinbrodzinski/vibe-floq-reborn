import { useLocation } from 'react-router-dom'

export const usePageVisibility = () => {
  const location = useLocation()
  
  // Return true if user is on the map/field view
  return location.pathname === '/field' || location.pathname === '/'
}