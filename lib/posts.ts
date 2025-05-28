
import { allPosts } from "./generated/posts"; // Adjusted import


export async function getSortedPostsData() {
  return allPosts.map((post: { id: any; title: any; date: any; contentPreview: any; contentHtml: any; }) => ({
    id: post.id,
    title: post.title,
    date: post.date,
    contentPreview: post.contentPreview,
    postContent: post.contentHtml,
  }));
}

export async function getPostData(id: string) {
  const post = allPosts.find((p: { id: string; }) => p.id === id);

  if (!post) {
    return null;
  }

  return {
    id: post.id,
    title: post.title,
    date: post.date,
    contentHtml: post.contentHtml, // This is already the full HTML
  };
}