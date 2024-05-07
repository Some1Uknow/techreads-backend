import mongoose, { Schema } from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    imagePath: {
      type: String,
      required: true,
    },
    author: {type:Schema.Types.ObjectId, ref: 'User'}
    
  },
  {
    timestamps: true,
  }
);

const blogModel = mongoose.model("Blog", blogSchema);
export default blogModel;
