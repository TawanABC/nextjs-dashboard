import { auth } from "@/auth";

export default async function Customers() {

    const session = await auth();
    return (<p>Hello {session?.user?.name} </p>);
}