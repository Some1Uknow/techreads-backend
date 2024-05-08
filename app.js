import express from "express";
import cors from "cors";
import "dotenv/config";
import User from "./schemas/user.js";
import bcrypt from "bcryptjs";
import connectDB from "./utils/mongodb.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import cookieParser from "cookie-parser";
import blogModel from "./schemas/blog.js";

var saltRounds = 10;
const app = express();
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const fileName = Date.now() + "-" + file.originalname;
    cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});

var corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use(express.json());

connectDB();

app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    const userData = await User.create({
      username,
      email,
      password: hashedPassword,
    });
    res.status(200).json(userData);
  } catch (error) {
    console.error("Error registering:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userData = await User.findOne({ username: username });
  if (!userData) {
    return res.status(400).json({ message: "Invalid username or password" });
  }
  bcrypt.compare(password, userData.password, function (err, result) {
    if (result == true) {
      console.log("Login DONE");
      jwt.sign(
        { username, id: userData._id },
        process.env.JWT,
        {},
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token)
            .status(200)
            .json({ id: userData._id, username });
        }
      );
    } else {
      console.log(err);
      res.status(400).json({ message: "Invalid username or password" });
    }
  });
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }
  jwt.verify(token, process.env.JWT, {}, (err, info) => {
    if (err) {
      console.error(err);
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(200).json(info);
  });
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("Logged Out");
});

app.post("/post", upload.single("file"), async (req, res) => {
  const { token } = req.cookies;
  const filePath = req.file.path;
  const { title, summary, content } = req.body;
  jwt.verify(token, process.env.JWT, {}, async (err, info) => {
    console.log(info);
    if (err) {
      console.error(err);
      return res.status(401).json({ message: "Invalid token" });
    }

    try {
      const blogData = await blogModel.create({
        title,
        summary,
        content,
        imagePath: filePath,
        author: info.id,
      });
      res.status(200).json({ message: "File uploaded successfully", blogData });
      console.log("uploaded blog");
    } catch (error) {
      console.log("cannot upload blogdata", error);
      res.status(400).json({ message: "Cannot upload blogdata" });
    }
  });
});

app.get("/blogs", async (req, res) => {
  try {
    const blogPosts = await blogModel.find({});
    res.status(200).json(blogPosts);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/users/:id", async (req, res) => {
  const authorId = req.params.id;
  try {
    const userDetails = await User.findById(authorId);
    if (!userDetails) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ userDetails });
  } catch (error) {
    console.error("Cannot find the user", error);
    res.status(400).json({ message: "The User is invalid" });
  }
});

app.get("/blogs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const blog = await blogModel.findById(id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json(blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/userblogs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const blog = await blogModel.find({ author: id });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json(blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const blog = await blogModel.findByIdAndDelete(id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res
      .status(200)
      .json({ message: "Blog deleted successfully", deletedBlog: blog });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/edit/:id", upload.single("file"), async (req, res) => {
  const { title, summary, content } = req.body;
  const file = req.file.path;
  try {
    const updatedPost = await blogModel.findByIdAndUpdate(req.params.id, {
      title,
      summary,
      content,
      imagePath: file,
    });
    res.status(200).json(updatedPost);
    console.log("updated");
  } catch (error) {
    console.error("Error updating blog post:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/profile/:id", async (req, res) => {
  const userId = req.params.id;
  const userProfile = await User.findById(userId);
  if (!userProfile) res.status(400).json({ message: "User doesnt exists" });
  res.status(200).json(userProfile);
});

app.put("/profile/:id", async (req, res) => {
  const { bio, username, email } = req.body;
  const userId = req.params.id;
  const userProfile = await User.findByIdAndUpdate(userId, {
    bio,
    username,
    email,
  });
  if (!userProfile) res.status(400).json({ message: "User doesnt exists" });
  res.status(200).json({message: "Profile Updated"});
});
