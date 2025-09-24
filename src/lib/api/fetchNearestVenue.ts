// Mock fetch function to fix build error
export const fetchNearestVenue = async (params: any) => {
  console.log('Mock fetchNearestVenue called with:', params);
  return null;
};