import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import breaks from "remark-breaks";

const postsDirectory = path.join(process.cwd(), "_posts");

export async function getSortedPostsData() {
    const fileNames = fs.readdirSync(postsDirectory);

    const allPostsData = fileNames.filter((fileName) => fileName.endsWith(".md")).map(
        async (fileName) => {
            const id = fileName.replace(/\.md$/, "");

            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = fs.readFileSync(fullPath, "utf8");

            const matterResult = matter(fileContents); // to get frontmatter metadata

            const contentPreview = matterResult.content.split("\n")[0];
            const postContent = await remark().use(html).process(matterResult.content);

            return {
                id,
                ...matterResult.data as { date: string, title: string },
                contentPreview,
                postContent,
            }
        }
    )
    const resolvedPosts = await Promise.all(allPostsData);

    return resolvedPosts.sort((a, b) => {
        if (a.date < b.date) {
            return 1;
        } else {
            return -1;
        }
    });
}

export async function getPostData(id: string) {
    const fullPath = path.join(postsDirectory, `${id}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
  
    const matterResult = matter(fileContents);
  
    const processedContent = await remark()
      .use(html)
      .use(breaks)
      .process(matterResult.content);
    const contentHtml = processedContent.toString();
  
    return {
      id,
      contentHtml,
      ...(matterResult.data as { date: string; title: string }),
    };
  }


