import { title } from "@/components/primitives";
import { getPostData, getSortedPostsData } from "@/lib/posts";

export async function generateStaticParams() {
    const posts = await getSortedPostsData();

    return posts.map((post) => ({
        slug: post.id,
    }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
    const postData = await getPostData(slug);

    return (
        <div className="flex flex-col gap-4">
            <h1 className={title()}>{postData?.title}</h1>
            <p className="text-sm text-gray-500">{postData?.date}</p>
            <div dangerouslySetInnerHTML={{ __html: postData?.contentHtml || "" }} />
        </div>
    );
}
