package tech.autokit

import android.app.*
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import android.util.Log

import androidx.core.content.ContextCompat

class Engine : Service() {

    private val trigger = Trigger()

    override fun onCreate() {
        Log.d("AutoKit", "onCreate")
        super.onCreate()
        setupForeground()

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_BATTERY_CHANGED)
            addAction(Intent.ACTION_POWER_CONNECTED)
            addAction(Intent.ACTION_POWER_DISCONNECTED)
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
        }

        ContextCompat.registerReceiver(
            this,
            trigger,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("AutoKit", "onStartCommand")
        return START_STICKY // Перезапустить сервис, если система его убьет
    }

    override fun onDestroy() {
        Log.d("AutoKit", "onDestroy")
        super.onDestroy()
        unregisterReceiver(trigger)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun setupForeground() {
        val channelId = "engine_service"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Engine Service", NotificationManager.IMPORTANCE_LOW)
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }
        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, channelId).setContentTitle("AutoKit Running").build()
        } else {
            Notification.Builder(this).setContentTitle("AutoKit Running").build()
        }
        startForeground(1, notification)
    }
}