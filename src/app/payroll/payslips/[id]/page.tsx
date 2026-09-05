import PayslipDetails from "@/src/pages/payroll/PayslipDetails"

export default async function PayslipDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  return <PayslipDetails id={resolvedParams.id} />
}
