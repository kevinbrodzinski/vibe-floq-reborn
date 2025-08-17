export const mapUserIdToProfileId = (d: any): any => {
  if (d && typeof d === 'object') {
    if ('profile_id' in d && !('profileId' in d)) {
      d.profileId = d.profile_id || d.user_id;
    }
    if (Array.isArray(d)) {
      d.forEach(mapUserIdToProfileId);
    } else {
      Object.values(d).forEach(mapUserIdToProfileId);
    }
  }
  return d;
};

/* Example usage with axios interceptor */
// axios.interceptors.response.use(res => {
//   res.data = mapUserIdToProfileId(res.data);
//   return res;
// }); 