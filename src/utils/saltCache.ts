import bcrypt from "bcrypt";
import NodeCache from "node-cache";

const saltCache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

export const getCachedSalt = async (rounds: number): Promise<string> => {
  const cacheKey = `salt_${rounds}`;
  let salt = saltCache.get<string>(cacheKey);

  if (!salt) {
    salt = await bcrypt.genSalt(rounds);
    saltCache.set(cacheKey, salt);
  }

  return salt;
};
