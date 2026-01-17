package tech.autokit

import android.os.Build
import android.content.Intent
import android.content.Context
import android.widget.Toast
import android.content.BroadcastReceiver
import android.util.Log

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class Trigger : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d("AutoKit", "Event: $action")
        Toast.makeText(context, "Event: $action", Toast.LENGTH_SHORT).show()

        val intent = Intent(context, Engine::class.java)
        context.startForegroundService(intent)
    }
}


class NotificationService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        val tickerText = sbn.notification.tickerText
        val extras = sbn.notification.extras
        val title = extras.getString("android.title")
        val text = extras.getCharSequence("android.text").toString()

        Log.d("AutoKit", "Уведомление от: $packageName")
        Log.d("AutoKit", "Заголовок: $title, Текст: $text")
        
        val intent = Intent(this, Engine::class.java)
        startForegroundService(intent)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        Log.d("AutoKit", "Уведомление удалено: ${sbn.packageName}")
    }
}

