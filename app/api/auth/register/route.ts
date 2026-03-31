// app/api/auth/register/route.ts — Email Registration
// Validates input, hashes password with bcrypt, creates User + Subscription.

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Subscription from '@/lib/models/Subscription'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_LETTER = /[a-zA-Z]/
const PASSWORD_NUMBER = /\d/
const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/
const MIN_PASSWORD_LENGTH = 8

interface RegisterBody {
  email: string
  password: string
  name?: string
}

function validateEmail(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return '이메일을 입력해주세요.'
  }
  if (!EMAIL_REGEX.test(email)) {
    return '올바른 이메일 형식이 아닙니다.'
  }
  return null
}

function validatePassword(password: string): string | null {
  if (!password || typeof password !== 'string') {
    return '비밀번호를 입력해주세요.'
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`
  }
  if (!PASSWORD_LETTER.test(password)) {
    return '비밀번호에 영문자를 포함해야 합니다.'
  }
  if (!PASSWORD_NUMBER.test(password)) {
    return '비밀번호에 숫자를 포함해야 합니다.'
  }
  if (!PASSWORD_SPECIAL.test(password)) {
    return '비밀번호에 특수문자를 포함해야 합니다.'
  }
  return null
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as RegisterBody

    // Validate email
    const emailError = validateEmail(body.email)
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 })
    }

    // Validate password
    const passwordError = validatePassword(body.password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    await connectDB()

    // Check email uniqueness
    const existingUser = await User.findOne({ email: body.email })
    if (existingUser) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다.' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12)

    // Create user
    const user = await User.create({
      email: body.email,
      password: hashedPassword,
      name: body.name || body.email.split('@')[0],
    })

    // Create free subscription
    await Subscription.create({
      userId: user._id,
      plan: 'free',
      status: 'active',
    })

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    console.error('[register] Error:', err)

    // Handle Mongoose duplicate key error
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Record<string, unknown>).code === 11000
    ) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
