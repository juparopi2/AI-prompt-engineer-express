

// TODO De esta forma puedo hacer un middleware para verificar si un usuario aun tiene tokens disponibles para gastar o no

// const authMiddleware = async (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   console.log("token", token);
//   if (!token) return res.status(401).json({ error: "No token" });

//   const { data, error } = await supabase.auth.getUser(token);
//   if (error) return res.status(401).json({ error: "Invalid token" });

//   req.user = data.user;
//   next();
// };

// module.exports = { authMiddleware };
