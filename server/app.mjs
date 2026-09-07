import "dotenv/config";
import express from "express";
import cors from "cors";
import { pathToFileURL } from "node:url";
import postRouter from "./apps/postRouter.mjs";
import categoryRouter from "./apps/categoryRouter.mjs";
import authRouter from "./apps/auth.mjs";
import profileRouter from "./apps/profileRouter.mjs";

const app = express();
const port = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello TechUp!");
});

app.use("/posts", postRouter);
app.use("/categories", categoryRouter);
app.use("/auth", authRouter);
app.use("/profile", profileRouter);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(port, () => {
    console.log(`Server is running at ${port}`);
  });
}

export default app;
