package dev.zero_native.examples.android

import android.app.Activity
import android.os.Bundle
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.widget.FrameLayout
import android.widget.TextView

class MainActivity : Activity(), SurfaceHolder.Callback {
    private var nativeApp: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        System.loadLibrary("zero_native_example")

        val surface = SurfaceView(this)
        surface.holder.addCallback(this)

        val label = TextView(this).apply {
            text = "zero-native Android Example"
            textSize = 22f
            setPadding(32, 32, 32, 32)
        }

        val root = FrameLayout(this)
        root.addView(surface)
        root.addView(label)
        setContentView(root)

        nativeApp = nativeCreate()
        nativeStart(nativeApp)
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        nativeResize(nativeApp, width.toFloat(), height.toFloat(), resources.displayMetrics.density, holder.surface)
        nativeFrame(nativeApp)
    }

    override fun surfaceCreated(holder: SurfaceHolder) = Unit

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        nativeStop(nativeApp)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        nativeTouch(nativeApp, event.getPointerId(0).toLong(), event.actionMasked, event.x, event.y, event.pressure)
        nativeFrame(nativeApp)
        return true
    }

    override fun onDestroy() {
        if (nativeApp != 0L) {
            nativeStop(nativeApp)
            nativeDestroy(nativeApp)
            nativeApp = 0
        }
        super.onDestroy()
    }

    external fun nativeCreate(): Long
    external fun nativeDestroy(app: Long)
    external fun nativeStart(app: Long)
    external fun nativeStop(app: Long)
    external fun nativeResize(app: Long, width: Float, height: Float, scale: Float, surface: Any)
    external fun nativeTouch(app: Long, id: Long, phase: Int, x: Float, y: Float, pressure: Float)
    external fun nativeFrame(app: Long)
}
