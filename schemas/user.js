import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: "No bio yet",
    },
    userImage: {
      type: String,
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
