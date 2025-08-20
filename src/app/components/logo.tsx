import Link from 'next/link'

export default function Logo() {
  return (
    <Link href='/' className='font-serif text-xl font-medium uppercase'>
      <span>Agile PM</span>
    </Link>
  )
}